(module
  (import
    "wasi_unstable"
    "fd_write"
    (func
      $fd_write
      (param
        i32
        i32
        i32
        i32
      )
      (result i32)
    )
  )
  (memory $mem 1)
  (export
    "memory"
    (memory 0)
  )
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $_result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $_result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $_result)
  )
  (func
    $_start
    (result i32)
    (local $val i32)
    (local $var_74379 i32)
    (i32.const 1)
    (i32.const 2)
    (call $add)
    (local.set $val)
    (local.set
      $var_74379
      (local.get $val)
      (i32.const 3)
      (call $eq)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_74379)
        )
        (i32.const -1)
      )
      (then
        (i32.const 1)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_74379)
            )
            (i32.const -1)
          )
          (then
            (i32.const 0)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "_start"
    (func $_start)
  )
)