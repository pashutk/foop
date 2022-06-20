(module
  (memory $mem 1)
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
    $AA
    (param $param0 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 2)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 1)
      )
      (local.get $param0)
    )
    (local.get $struct_start_address)
  )
  (func
    $BB
    (result i32)
    (local $struct_start_address i32)
    (i32.const 1)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $main
    (result i32)
    (local $var_21423 i32)
    (local $a i32)
    (local.set
      $var_21423
      (call $BB)
      (call $AA)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load8_u
          (local.get $var_21423)
        )
        (i32.const 0)
      )
      (then
        (local.set
          $a
          (i32.load8_u
            (i32.add
              (local.get $var_21423)
              (i32.const 1)
            )
          )
        )
        (local $var_22943 i32)
        (local $b i32)
        (local.set
          $var_22943
          (local.get $a)
        )
        (if
          (result i32)
          (i32.eq
            (i32.load8_u
              (local.get $var_22943)
            )
            (i32.const 0)
          )
          (then
            (local.set
              $b
              (i32.load8_u
                (i32.add
                  (local.get $var_22943)
                  (i32.const 1)
                )
              )
            )
            (i32.const 2)
          )
          (else
            (if
              (result i32)
              (i32.eq
                (i32.load8_u
                  (local.get $var_22943)
                )
                (i32.const 1)
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
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load8_u
              (local.get $var_21423)
            )
            (i32.const 1)
          )
          (then
            (i32.const 1)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "main"
    (func $main)
  )
)
